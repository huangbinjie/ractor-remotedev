import { Store, System } from "ractor"
import { connectViaExtension, extractState } from "remotedev"

export class RemoteDevStore extends Store<any> {
  remotedev: any
  connection: any

  eventHandler(action: any) {
    if (isPlainObject(action)) {
      this.remotedev.send(action.type ? action.type : "update", action.payload)
    }

    if (isClassAction(action)) {
      this.remotedev.send(Object.getPrototypeOf(action).constructor.name, genStateTree(this.context.system))
    }
  }
  preStart() {
    this.remotedev = connectViaExtension()
    this.context.system.eventStream.on("**", this.eventHandler.bind(this))

    this.connection = this.remotedev.subscribe((message: any) => {
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
    })

    this.remotedev.send("init")
    this.remotedev.send("ready", genStateTree(this.context.system))
  }
  postStop() {
    this.context.system.eventStream.off("**", this.eventHandler.bind(this))
    this.connection.unsubscribe()
  }
  createReceive() {
    return this.receiveBuilder().build()
  }
}

function genStateTree(system: System) {
  const stores = system.getRoot().getContext().children
  const stateTree: { [key: string]: any } = {}
  for (let store of stores) {
    const instance = store[1].getInstance() as Store<any>
    stateTree[store[0]] = instance.state
  }
  return stateTree
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
