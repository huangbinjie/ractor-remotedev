import { Store, System } from "ractor"
import { connectViaExtension, extractState } from "remotedev"

type Message = {
  id: string,
  type: "ACTION" | "DISPATCH",
  payload: any,
  source: "@devtools-extension"
}
type Options = {
  [key: string]: any,
  actionCreators: Array<new () => any> | { [key: string]: new () => any }
}
export function createRemoteDevStore(options: { [key: string]: any }): new () => Store<any> {
  return class RemoteDevStore extends Store<any> {
    remotedev: any
    connection: any

    eventHandler(action: any) {
      if (isPlainObject(action)) {
        this.remotedev.send(action.type ? action.type : "update", action.payload)
      }

      if (isClassAction(action)) {
        this.remotedev.send({ type: Object.getPrototypeOf(action).constructor.name, payload: action }, this.genStateTree())
      }
    }
    genStateTree() {
      const stores = this.context.system.getRoot().getContext().children
      const stateTree: { [key: string]: any } = {}
      for (let store of stores) {
        const instance = store[1].getInstance() as Store<any>
        stateTree[store[0]] = instance.state
      }
      return stateTree
    }
    preStart() {
      this.remotedev = connectViaExtension(options)
      this.context.system.eventStream.on("**", this.eventHandler.bind(this))

      this.connection = this.remotedev.subscribe((message: Message) => {
        // jump into
        if (message.type === "DISPATCH") {
          const state = extractState(message)
          if (state) {
            Object.keys(state).forEach(storeName => {
              const ref = this.context.system.getRoot().getContext().child(storeName)
              if (ref) {
                const store = ref.getInstance() as Store<any>
                store.replaceState(state[storeName])
              }
            })
          }
        }

        // devtools triggers action
        if (message.type === "ACTION") {
          const actionCreators = options["actionCreators"]
          if (actionCreators) {
            const type = message.payload.name
            const payload = message.payload.args
            const selected = message.payload.selected
            const selectedClass = Array.isArray(actionCreators) ? actionCreators[selected] : actionCreators[type]
            const ractorAction = new selectedClass(...payload)
            this.context.system.dispatch(ractorAction)
          }
        }

      })

      this.remotedev.init(this.genStateTree())
    }
    postStop() {
      this.context.system.eventStream.off("**", this.eventHandler.bind(this))
      this.connection.unsubscribe()
    }
    createReceive() {
      return this.receiveBuilder().build()
    }
  }
}

function isPlainObject(obj: any) {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}

function isClassAction(obj: any) {
  if (typeof obj !== 'object' || obj === null) return false

  return Object.getPrototypeOf(obj) !== Object.prototype
}
