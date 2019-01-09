import { Store } from "ractor"
import { connectViaExtension, extractState } from "remotedev"

type Message = {
  id: string,
  type: "ACTION" | "DISPATCH",
  payload: any,
  source: "@devtools-extension"
}
type Options = {
  [key: string]: any,
  actionCreators: Array<new (...args: any[]) => any> | { [key: string]: new (...args: any[]) => any }
}
export function createRemoteDevStore(options: Options): new () => Store<any> {
  return class RemoteDevStore extends Store<any> {
    remotedev: any
    connection: any

    eventHandler(action: any) {
      this.remotedev.send(action.type ? action.type : "update", action.payload)
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
      if (!this.context.system.serialize) {
        console.warn("Not that if you dont set system option `serialize` to be true, you can not use custom action.")
      }
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
          if (typeof message.payload === "string") {
            if (this.context.system.serialize) {
              try {
                const action = JSON.parse(message.payload)
                this.context.system.eventStream.emit("**", action)
              } catch {
                throw TypeError("Action muse be plain object and should contain type and payload fields.")
              }
            }
          } else {
            const actionCreators = options["actionCreators"]
            const type = message.payload.name
            const payload = message.payload.args
            const selected = message.payload.selected
            if (this.context.system.serialize) {
              this.context.system.eventStream.emit("**", { type, payload })
            } else {
              const selectedClass = Array.isArray(actionCreators) ? actionCreators[selected] : actionCreators[type]
              const ractorAction = new selectedClass(...payload)
              this.context.system.dispatch(ractorAction)
            }
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
