import extend from '@interactjs/utils/extend'
import getOriginXY from '@interactjs/utils/getOriginXY'
import hypot from '@interactjs/utils/hypot'
import defaults from './defaultOptions'
import Interactable from './Interactable'
import Interaction from './Interaction'

export class InteractEvent {
  type: string
  target: Element
  relatedTarget: Element | null
  currentTarget: Element
  screenX?: number
  screenY?: number
  button: number
  buttons: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  // added by interact.js
  interactable: Interactable
  interaction: any
  page: Interact.Point
  client: Interact.Point
  delta: Interact.Point
  x0: number
  y0: number
  t0: number
  dt: number
  duration: number
  clientX0: number
  clientY0: number
  velocity: Interact.Point
  speed: number
  swipe: ReturnType<InteractEvent['getSwipe']>
  timeStamp: any
  // drag
  dragEnter?: Element
  dragLeave?: Element
  // resize
  axes?: Interact.Point
  // gestureend
  distance?: number
  angle?: number
  da?: number // angle change
  scale?: number // ratio of distance start to current event
  ds?: number // scale change
  box?: Interact.Rect // enclosing box of all points
  preEnd?: boolean
  immediatePropagationStopped = false
  propagationStopped = false

  /** */
  constructor (interaction: Interaction, event: Interact.PointerEventType, actionName: string, phase: string, element: Element, related?: Element, preEnd?: boolean, type?: string) {
    element = element || interaction.element as Element

    const target      = interaction.target
    // FIXME: add deltaSource to defaults
    const deltaSource = (((target && target.options) || defaults) as any).deltaSource as 'page' | 'client'
    const origin      = getOriginXY(target, element, actionName)
    const starting    = phase === 'start'
    const ending      = phase === 'end'
    const prevEvent   = starting ? this : interaction.prevEvent
    const coords      = starting
      ? interaction.coords.start
      : ending
        ? { page: prevEvent.page, client: prevEvent.client, timeStamp: interaction.coords.cur.timeStamp }
        : interaction.coords.cur

    this.page      = extend({}, coords.page)
    this.client    = extend({}, coords.client)
    this.timeStamp = coords.timeStamp

    if (!ending) {
      this.page.x -= origin.x
      this.page.y -= origin.y

      this.client.x -= origin.x
      this.client.y -= origin.y
    }

    this.ctrlKey       = event.ctrlKey
    this.altKey        = event.altKey
    this.shiftKey      = event.shiftKey
    this.metaKey       = event.metaKey
    this.button        = (event as MouseEvent).button
    this.buttons       = (event as MouseEvent).buttons
    this.target        = element
    this.currentTarget = element
    this.relatedTarget = related || null
    this.preEnd        = preEnd
    this.type          = type || (actionName + (phase || ''))
    this.interaction   = interaction
    this.interactable  = target

    this.t0 = starting
      ? interaction.pointers[interaction.pointers.length - 1].downTime
      : prevEvent.t0

    this.x0       = interaction.coords.start.page.x - origin.x
    this.y0       = interaction.coords.start.page.y - origin.y
    this.clientX0 = interaction.coords.start.client.x - origin.x
    this.clientY0 = interaction.coords.start.client.y - origin.y

    if (starting || ending) {
      this.delta = { x: 0, y: 0 }
    }
    else {
      this.delta = {
        x: this[deltaSource].x - prevEvent[deltaSource].x,
        y: this[deltaSource].y - prevEvent[deltaSource].y,
      }
    }

    this.dt        = interaction.coords.delta.timeStamp
    this.duration  = this.timeStamp - this.t0

    // velocity and speed in pixels per second
    this.velocity = extend({}, interaction.coords.velocity[deltaSource])
    this.speed = hypot(this.velocity.x, this.velocity.y)

    this.swipe = (ending || phase === 'inertiastart') ? this.getSwipe() : null
  }

  get pageX () { return this.page.x }
  set pageX (value) { this.page.x = value }
  get pageY () { return this.page.y }
  set pageY (value) { this.page.y = value }

  get clientX () { return this.client.x }
  set clientX (value) { this.client.x = value }
  get clientY () { return this.client.y }
  set clientY (value) { this.client.y = value }

  get dx () { return this.delta.x }
  set dx (value) { this.delta.x = value }
  get dy () { return this.delta.y }
  set dy (value) { this.delta.y = value }

  get velocityX () { return this.velocity.x }
  set velocityX (value) { this.velocity.x = value }
  get velocityY () { return this.velocity.y }
  set velocityY (value) { this.velocity.y = value }

  getSwipe () {
    const interaction = this.interaction

    if (interaction.prevEvent.speed < 600 ||
        this.timeStamp - interaction.prevEvent.timeStamp > 150) {
      return null
    }

    let angle = 180 * Math.atan2(interaction.prevEvent.velocityY, interaction.prevEvent.velocityX) / Math.PI
    const overlap = 22.5

    if (angle < 0) {
      angle += 360
    }

    const left = 135 - overlap <= angle && angle < 225 + overlap
    const up   = 225 - overlap <= angle && angle < 315 + overlap

    const right = !left && (315 - overlap <= angle || angle <  45 + overlap)
    const down  = !up   &&   45 - overlap <= angle && angle < 135 + overlap

    return {
      up,
      down,
      left,
      right,
      angle,
      speed: interaction.prevEvent.speed,
      velocity: {
        x: interaction.prevEvent.velocityX,
        y: interaction.prevEvent.velocityY,
      },
    }
  }

  preventDefault () {}

  /**
   * Don't call listeners on the remaining targets
   */
  stopImmediatePropagation () {
    this.immediatePropagationStopped = this.propagationStopped = true
  }

  /**
   * Don't call any other listeners (even on the current target)
   */
  stopPropagation () {
    this.propagationStopped = true
  }
}

export default InteractEvent
