import { Container, NineSliceSprite } from 'pixi.js';
import { Signal } from 'typed-signals';
import { Button } from './Button';
import { type ButtonOptions, FancyButton } from './FancyButton';
import { List, type ListOptions } from './List';
import { ScrollBox, ScrollBoxOptions } from './ScrollBox';
import { AnyText, PixiText } from './utils/helpers/text';
import { type GetViewSettings } from './utils/helpers/view';
type Animation = {
    props: Record<string, any>;
    duration?: number;
};
export type DialogOptions = {
    backdrop?: GetViewSettings;
    backdropColor?: number;
    backdropAlpha?: number;
    background: GetViewSettings;
    title?: AnyText;
    content?: AnyText | Container | Container[];
    width?: number;
    height?: number;
    padding?: number;
    buttons?: (ButtonOptions | FancyButton | Button)[];
    buttonList?: ListOptions<Container>;
    scrollBox?: ScrollBoxOptions;
    animations?: {
        open?: Animation;
        close?: Animation;
    };
    closeOnBackdropClick?: boolean;
    nineSliceSprite?: [number, number, number, number];
};
/**
 * Modal dialog component for asking users questions.
 * @example
 * const dialog = new Dialog({
 *     background: new Graphics().roundRect(0, 0, 400, 200, 20).fill(0xFFFFFF),
 *     title: 'Confirm',
 *     content: 'Are you sure?',
 *     buttons: [
 *         { text: 'Cancel' },
 *         { text: 'OK' }
 *     ]
 * });
 * dialog.onSelect.connect((index, text) => {
 *     console.log(`Button ${index} clicked: ${text}`);
 * });
 * dialog.open();
 */
export declare class Dialog extends Container {
    protected backdrop: Container;
    protected innerView?: Container | NineSliceSprite;
    protected contentView: Container;
    protected titleText?: PixiText;
    protected contentBody?: Container;
    protected scrollBox: ScrollBox;
    protected buttonContainer: List;
    protected readonly options: DialogOptions;
    protected _isOpen: boolean;
    /** Signal emitted when a button is selected. */
    onSelect: Signal<(buttonIndex: number, buttonText: string) => void>;
    /** Signal emitted when the dialog is closed. */
    onClose: Signal<() => void>;
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
    constructor(options: DialogOptions);
    /** Gets the dialog width from options or innerView. */
    protected get dialogWidth(): number;
    /** Gets the dialog height from options or innerView. */
    protected get dialogHeight(): number;
    /** Gets the dialog padding from options. */
    protected get dialogPadding(): number;
    /** Gets the open state of the dialog. */
    get isOpen(): boolean;
    /** Initializes the backdrop (semi-transparent background). */
    protected initBackdrop(): void;
    /** Initializes the inner view (background panel). */
    protected initInnerView(): void;
    /** Initializes the title text if provided. */
    protected initTitle(): void;
    /** Initializes the content area, optionally wrapped in ScrollBox. */
    protected initContent(): void;
    /** Initializes the buttons at the bottom of the dialog. */
    protected initButtons(): void;
    /** Opens the dialog with animation. */
    open(): void;
    /** Closes the dialog with animation. */
    close(): void;
    /** Shows the dialog (alias for open). */
    show(): void;
    /** Hides the dialog (alias for close). */
    hide(): void;
}
export {};
//# sourceMappingURL=Dialog.d.ts.map