import { Store } from "ractor"
import { connectViaExtension, extractState } from "remotedev"

export class RemoteDevStore extends Store {
  eventHandler(action) {
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

    this.connection = this.remotedev.subscribe(message => {
      const state = extractState(message)
      if (state) {
        Object.keys(state).forEach(storeName => {
          const store = this.context.system.getRoot().getContext().child(storeName).getInstance()
          store.replaceState(state[storeName])
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

function genStateTree(system) {
  const stores = system.getRoot().getContext().children
  const stateTree = {}
  for (let store of stores) {
    const instance = store[1].getInstance()
    stateTree[store[0]] = instance.state
  }
  return stateTree
}

function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}

function isClassAction(obj) {
  if (typeof obj !== 'object' || obj === null) return false

  return Object.getPrototypeOf(obj) !== Object.prototype
}
