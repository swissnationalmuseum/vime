import { Component, h, Host, Prop, State, Watch } from '@stencil/core';

import { Disposal } from '../../../../utils/Disposal';
import { listen } from '../../../../utils/dom';
import { debounce } from '../../../../utils/timing';
import { isUndefined } from '../../../../utils/unit';
import { findPlayer } from '../../../core/player/findPlayer';
import {
  createDispatcher,
  Dispatcher,
} from '../../../core/player/PlayerDispatcher';
import { PlayerProps } from '../../../core/player/PlayerProps';
import { withComponentRegistry } from '../../../core/player/withComponentRegistry';
import { withPlayerContext } from '../../../core/player/withPlayerContext';
import { registerControlsForCollisionDetection } from './withControlsCollisionDetection';

/**
 * We want to keep the controls active state in-sync per player.
 */
const playerRef: Record<any, HTMLVmPlayerElement> = {};
const hideControlsTimeout: Record<any, number | undefined> = {};

/**
 * Responsible for positioning and laying out individual/groups of controls.
 *
 * ## Visual
 *
 * <img
 *   src="https://raw.githubusercontent.com/vime-js/vime/master/packages/core/src/components/ui/controls/controls/controls.png"
 *   alt="Vime controls component"
 * />
 *
 * @slot - Used to pass in controls.
 */
@Component({
  tag: 'vm-controls',
  styleUrl: 'controls.css',
  shadow: true,
})
export class Controls {
  private dispatch!: Dispatcher;

  private disposal = new Disposal();

  @State() isInteracting = false;

  /**
   * Whether the controls are visible or not.
   */
  @Prop() hidden = false;

  /**
   * Whether the controls container should be 100% width. This has no effect if the view is of
   * type `audio`.
   */
  @Prop() fullWidth = false;

  /**
   * Whether the controls container should be 100% height. This has no effect if the view is of
   * type `audio`.
   */
  @Prop() fullHeight = false;

  /**
   * Sets the `flex-direction` property that manages the direction in which the controls are layed
   * out.
   */
  @Prop() direction: 'row' | 'column' = 'row';

  /**
   * Sets the `align-items` flex property that aligns the individual controls on the cross-axis.
   */
  @Prop() align: 'start' | 'center' | 'end' = 'center';

  /**
   * Sets the `justify-content` flex property that aligns the individual controls on the main-axis.
   */
  @Prop() justify:
    | 'start'
    | 'center'
    | 'end'
    | 'flex-end'
    | 'space-around'
    | 'space-between'
    | 'space-evenly' = 'start';

  /**
   * Pins the controls to the defined position inside the video player. This has no effect when
   * the view is of type `audio`.
   */
  @Prop({
    reflect: true,
  })
  pin: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center' =
    'bottomLeft';

  /**
   * The length in milliseconds that the controls are active for before fading out. Audio players
   * are not effected by this prop.
   */
  @Prop() activeDuration = 2750;

  /**
   * Whether the controls should wait for playback to start before being shown. Audio players
   * are not effected by this prop.
   */
  @Prop() waitForPlaybackStart = false;

  /**
   * Whether the controls should show/hide when paused. Audio players are not effected by this prop.
   */
  @Prop() hideWhenPaused = false;

  /**
   * Whether the controls should hide when the mouse leaves the player. Audio players are not
   * effected by this prop.
   */
  @Prop() hideOnMouseLeave = false;

  /** @internal */
  @Prop() isAudioView: PlayerProps['isAudioView'] = false;

  /** @internal */
  @Prop() isSettingsActive: PlayerProps['isSettingsActive'] = false;

  /** @internal */
  @Prop() playbackReady: PlayerProps['playbackReady'] = false;

  /** @internal */
  @Prop() isControlsActive: PlayerProps['isControlsActive'] = false;

  /** @internal */
  @Prop() paused: PlayerProps['paused'] = true;

  /** @internal */
  @Prop() playbackStarted: PlayerProps['playbackStarted'] = false;

  constructor() {
    withComponentRegistry(this);
    registerControlsForCollisionDetection(this);
    withPlayerContext(this, [
      'playbackReady',
      'isAudioView',
      'isControlsActive',
      'isSettingsActive',
      'paused',
      'playbackStarted',
    ]);
  }

  connectedCallback() {
    this.dispatch = createDispatcher(this);
    this.onControlsChange();
    this.setupPlayerListeners();
  }

  componentWillLoad() {
    this.onControlsChange();
  }

  disconnectedCallback() {
    this.disposal.empty();
    delete hideControlsTimeout[playerRef[this]];
    delete playerRef[this];
  }

  private async setupPlayerListeners() {
    const player = await findPlayer(this);
    if (isUndefined(player)) return;
    const events = ['focus', 'keydown', 'click', 'touchstart', 'mouseleave'];
    events.forEach(event => {
      this.disposal.add(
        listen(player, event, this.onControlsChange.bind(this)),
      );
    });
    this.disposal.add(
      listen(
        player,
        'mousemove',
        debounce(this.onControlsChange, 50, true).bind(this),
      ),
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    playerRef[this] = player;
  }

  private show() {
    this.dispatch('isControlsActive', true);
  }

  private hide() {
    this.dispatch('isControlsActive', false);
  }

  private hideWithDelay() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    clearTimeout(hideControlsTimeout[playerRef[this]]);
    hideControlsTimeout[playerRef[this]] = setTimeout(() => {
      this.hide();
    }, this.activeDuration) as any;
  }

  @Watch('paused')
  @Watch('hidden')
  @Watch('isAudioView')
  @Watch('isInteracting')
  @Watch('isSettingsActive')
  @Watch('hideWhenPaused')
  @Watch('hideOnMouseLeave')
  @Watch('playbackStarted')
  @Watch('waitForPlaybackStart')
  @Watch('playbackReady')
  private onControlsChange(event?: Event) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    clearTimeout(hideControlsTimeout[playerRef[this]]);

    if (this.hidden || !this.playbackReady) {
      this.hide();
      return;
    }

    if (this.isAudioView) {
      this.show();
      return;
    }

    if (this.waitForPlaybackStart && !this.playbackStarted) {
      this.hide();
      return;
    }

    if (this.isInteracting || this.isSettingsActive) {
      this.show();
      return;
    }

    if (this.hideWhenPaused && this.paused) {
      this.hideWithDelay();
      return;
    }

    if (this.hideOnMouseLeave && !this.paused && event?.type === 'mouseleave') {
      this.hide();
      return;
    }

    if (!this.paused) {
      this.show();
      this.hideWithDelay();
      return;
    }

    this.show();
  }

  private getPosition() {
    if (this.isAudioView) return {};

    if (this.pin === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    // topLeft => { top: 0, left: 0 }
    const pos = this.pin.split(/(?=[L|R])/).map(s => s.toLowerCase());
    return { [pos[0]]: 0, [pos[1]]: 0 };
  }

  private onStartInteraction() {
    this.isInteracting = true;
  }

  private onEndInteraction() {
    this.isInteracting = false;
  }

  render() {
    return (
      <Host video={!this.isAudioView}>
        <div
          style={{
            ...this.getPosition(),
            flexDirection: this.direction,
            alignItems:
              this.align === 'center' ? 'center' : `flex-${this.align}`,
            justifyContent: this.justify,
          }}
          class={{
            controls: true,
            audio: this.isAudioView,
            hidden: this.hidden,
            active: this.playbackReady && this.isControlsActive,
            fullWidth: this.isAudioView || this.fullWidth,
            fullHeight: !this.isAudioView && this.fullHeight,
          }}
          onMouseEnter={this.onStartInteraction.bind(this)}
          onMouseLeave={this.onEndInteraction.bind(this)}
          onTouchStart={this.onStartInteraction.bind(this)}
          onTouchEnd={this.onEndInteraction.bind(this)}
        >
          <slot />
        </div>
      </Host>
    );
  }
}
