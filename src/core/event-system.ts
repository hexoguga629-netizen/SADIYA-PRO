import { EventEmitter } from 'events'

export const coreEvents = new EventEmitter()

coreEvents.setMaxListeners(999)
