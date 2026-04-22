import { Container, Ticker, Sprite, Texture, NineSliceSprite, Graphics } from 'pixi.js';
import { Group, Tween } from 'tweedle.js';
import { Signal } from 'typed-signals';
import { Button } from './Button.mjs';
import { FancyButton } from './FancyButton.mjs';
import { List } from './List.mjs';
import { ScrollBox } from './ScrollBox.mjs';
import { getTextView } from './utils/helpers/text.mjs';
import { getView } from './utils/helpers/view.mjs';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class Dialog extends Container {
  /**
   * Modal dialog component for asking users questions.
   * @param {DialogOptions} options - Configuration options for the dialog.
   * @param {string | Texture | Container | Sprite | Graphics} options.backdrop - Backdrop view or settings.
   * @param {number} options.backdropColor - Color of the backdrop (if backdrop is not provided).
   * @param {number} options.backdropAlpha - Alpha of the backdrop (if backdrop is not provided).
   * @param {string | Texture | Container | Sprite | Graphics} options.background -
   * Background view or settings for the dialog.
   * @param {string | Texture | Container | Sprite | Graphics} options.title -
   * Title text or settings for the dialog.
   * @param {string | Texture | Container | Sprite | Graphics | Container[]} options.content -
   * Content text, view, or array of views for the dialog.
   * @param {number} options.width - Width of the dialog.
   * @param {number} options.height - Height of the dialog.
   * @param {number} options.padding - Padding around the dialog content.
   * @param {(ButtonOptions | FancyButton | Button)[]} options.buttons - Array of button configurations or instances.
   * @param {ListOptions<Container>} options.buttonList - Configuration options for the button list layout.
   * @param {ScrollBoxOptions} options.scrollBox - Configuration options for the scroll box containing the content.
   * @param {object} options.animations - Animation settings for opening and closing the dialog.
   * @param {Animation} options.animations.open - Animation settings for opening the dialog.
   * @param {Animation} options.animations.close - Animation settings for closing the dialog.
   * @param {boolean} options.closeOnBackdropClick - Whether to close the dialog when clicking on the backdrop.
   * @param {[number, number, number, number]} options.nineSliceSprite - Nine-slice scaling settings for the background.
   */
  constructor(options) {
    super();
    __publicField(this, "backdrop");
    __publicField(this, "innerView");
    __publicField(this, "contentView");
    __publicField(this, "titleText");
    __publicField(this, "contentBody");
    __publicField(this, "scrollBox");
    __publicField(this, "buttonContainer");
    __publicField(this, "options");
    __publicField(this, "_isOpen", false);
    /** Signal emitted when a button is selected. */
    __publicField(this, "onSelect");
    /** Signal emitted when the dialog is closed. */
    __publicField(this, "onClose");
    this.options = options;
    this.onSelect = new Signal();
    this.onClose = new Signal();
    this.backdrop = new Container();
    this.contentView = new Container();
    this.buttonContainer = new List({
      type: "horizontal",
      elementsMargin: 10,
      ...options.buttonList
    });
    this.initBackdrop();
    this.initInnerView();
    this.initTitle();
    this.initButtons();
    const offset = this.dialogPadding;
    const { width } = this.options;
    let { height } = this.options;
    if (height) {
      height = height - offset * 2 - this.buttonContainer.height;
      if (this.titleText?.height) {
        height -= this.titleText.height;
      }
    }
    this.scrollBox = new ScrollBox({
      background: 0,
      elementsMargin: 10,
      radius: 0,
      type: "bidirectional",
      padding: 10,
      ...this.options.scrollBox,
      width: width ? width - offset * 2 : 0,
      height
    });
    this.innerView?.addChild(this.scrollBox);
    this.visible = false;
    this.initContent();
    Ticker.shared.add(() => Group.shared.update());
  }
  /** Gets the dialog width from options or innerView. */
  get dialogWidth() {
    return this.options.width ?? this.innerView?.width ?? 0;
  }
  /** Gets the dialog height from options or innerView. */
  get dialogHeight() {
    return this.options.height ?? this.innerView?.height ?? 0;
  }
  /** Gets the dialog padding from options. */
  get dialogPadding() {
    return this.options.padding ?? 20;
  }
  /** Gets the open state of the dialog. */
  get isOpen() {
    return this._isOpen;
  }
  /** Initializes the backdrop (semi-transparent background). */
  initBackdrop() {
    if (this.options.backdrop) {
      this.backdrop = getView(this.options.backdrop);
    } else {
      const backdropSprite = new Sprite(Texture.WHITE);
      backdropSprite.tint = this.options.backdropColor ?? 0;
      backdropSprite.alpha = this.options.backdropAlpha ?? 0.5;
      backdropSprite.width = 1e4;
      backdropSprite.height = 1e4;
      this.backdrop = backdropSprite;
    }
    this.backdrop.eventMode = "static";
    this.backdrop.x = -5e3;
    this.backdrop.y = -5e3;
    if (this.options.closeOnBackdropClick) {
      this.backdrop.on("pointertap", () => this.close());
    }
    this.addChild(this.backdrop);
  }
  /** Initializes the inner view (background panel). */
  initInnerView() {
    const { background, nineSliceSprite } = this.options;
    if (nineSliceSprite) {
      if (typeof background === "string") {
        this.innerView = new NineSliceSprite({
          texture: Texture.from(background),
          leftWidth: nineSliceSprite[0],
          topHeight: nineSliceSprite[1],
          rightWidth: nineSliceSprite[2],
          bottomHeight: nineSliceSprite[3]
        });
      } else if (background instanceof Texture) {
        this.innerView = new NineSliceSprite({
          texture: background,
          leftWidth: nineSliceSprite[0],
          topHeight: nineSliceSprite[1],
          rightWidth: nineSliceSprite[2],
          bottomHeight: nineSliceSprite[3]
        });
      } else {
        console.warn(
          "NineSliceSprite can not be used with views set as Container. Pass the texture or texture name as instead of the Container extended instance."
        );
        this.innerView = getView(background);
      }
    } else {
      this.innerView = getView(background);
    }
    if (this.options.width && this.options.height) {
      if (this.innerView instanceof NineSliceSprite) {
        this.innerView.width = this.options.width;
        this.innerView.height = this.options.height;
      } else if (this.innerView instanceof Graphics) {
        this.innerView.width = this.options.width;
        this.innerView.height = this.options.height;
      }
    }
    if ("anchor" in this.innerView) {
      this.innerView.anchor.set(0.5, 0.5);
    } else {
      this.innerView.pivot.set(this.dialogWidth / 2, this.dialogHeight / 2);
    }
    this.innerView.eventMode = "static";
    this.addChild(this.innerView);
    this.innerView.addChild(this.contentView);
  }
  /** Initializes the title text if provided. */
  initTitle() {
    if (!this.options.title) return;
    this.titleText = getTextView(this.options.title);
    if ("anchor" in this.titleText) {
      this.titleText.anchor.set(0.5, 0);
    }
    this.titleText.x = this.dialogWidth / 2;
    this.titleText.y = this.dialogPadding;
    this.contentView.addChild(this.titleText);
  }
  /** Initializes the content area, optionally wrapped in ScrollBox. */
  initContent() {
    if (!this.options.content) return;
    let yOffset = this.dialogPadding;
    if (this.titleText) {
      yOffset += this.titleText.height;
    }
    if (typeof this.options.content === "string" || typeof this.options.content === "number") {
      const textView = getTextView(this.options.content);
      this.scrollBox.addItem(textView);
    } else if (Array.isArray(this.options.content)) {
      this.options.content.forEach((item) => this.scrollBox.addItem(item));
    } else {
      this.scrollBox.addItem(this.options.content);
    }
    this.scrollBox.x = this.dialogPadding;
    this.scrollBox.y = yOffset;
    this.contentView.addChild(this.scrollBox);
  }
  /** Initializes the buttons at the bottom of the dialog. */
  initButtons() {
    if (!this.options.buttons || this.options.buttons.length === 0) {
      return;
    }
    const buttonConfigs = this.options.buttons;
    buttonConfigs.forEach((btn, index) => {
      let button;
      switch (true) {
        case btn instanceof Button:
          btn.onPress.connect(() => {
            this.onSelect.emit(index, "");
          });
          if (btn.view) {
            this.buttonContainer.addChild(btn.view);
          }
          break;
        case btn instanceof FancyButton:
          btn.onPress.connect(() => {
            this.onSelect.emit(index, btn.text ?? "");
          });
          this.buttonContainer.addChild(btn);
          break;
        default:
          button = new FancyButton(btn);
          button.onPress.connect(() => {
            this.onSelect.emit(index, button.text ?? "");
          });
          this.buttonContainer.addChild(button);
          break;
      }
    });
    this.buttonContainer.x = this.dialogWidth / 2 - this.buttonContainer.width / 2;
    this.buttonContainer.y = this.dialogHeight - this.dialogPadding - this.buttonContainer.height;
    this.contentView.addChild(this.buttonContainer);
  }
  /** Opens the dialog with animation. */
  open() {
    if (!this.innerView) return;
    this.visible = true;
    this._isOpen = true;
    const openAnimation = this.options.animations?.open;
    if (!openAnimation) {
      this.backdrop.alpha = this.options.backdropAlpha ?? 0.5;
      this.innerView.scale.set(1);
      return;
    }
    this.backdrop.alpha = 0;
    this.innerView.scale.set(0.8);
    const duration = openAnimation.duration ?? 300;
    new Tween(this.backdrop).to({ alpha: this.options.backdropAlpha ?? 0.5 }, duration).start();
    new Tween(this.innerView.scale).to({ x: 1, y: 1 }, duration).start();
  }
  /** Closes the dialog with animation. */
  close() {
    if (!this.innerView) return;
    const closeAnimation = this.options.animations?.close;
    if (!closeAnimation) {
      this.visible = false;
      this._isOpen = false;
      this.onClose.emit();
      return;
    }
    const duration = closeAnimation.duration ?? 300;
    new Tween(this.backdrop).to({ alpha: 0 }, duration).start();
    new Tween(this.innerView.scale).to({ x: 0.8, y: 0.8 }, duration).onComplete(() => {
      this.visible = false;
      this._isOpen = false;
      this.onClose.emit();
    }).start();
  }
  /** Shows the dialog (alias for open). */
  show() {
    this.open();
  }
  /** Hides the dialog (alias for close). */
  hide() {
    this.close();
  }
}

export { Dialog };
//# sourceMappingURL=Dialog.mjs.map
