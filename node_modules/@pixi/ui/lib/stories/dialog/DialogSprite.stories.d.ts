import { PixiStory, StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    width: number;
    height: number;
    padding: number;
    backgroundColor: string;
    titleColor: string;
    contentColor: string;
    buttonColor: string;
    buttonHoverColor: string;
    buttonPressedColor: string;
    buttonDisabledColor: string;
};
type Args = typeof args;
export declare const LetterGridSelector: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
    args: any;
};
declare const swapDialogArgs: {
    width: number;
    height: number;
    padding: number;
    verticalList: boolean;
    backgroundColor: string;
    titleColor: string;
    checkboxUncheckedColor: string;
    checkboxCheckedColor: string;
    checkboxTextColor: string;
    buttonColor: string;
    buttonHoverColor: string;
    buttonPressedColor: string;
    buttonDisabledColor: string;
};
type SwapArgs = typeof swapDialogArgs;
export declare const CheckboxSwapDialog: {
    render: (args: SwapArgs, ctx: StoryContext) => PixiStory<unknown>;
    args: any;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=DialogSprite.stories.d.ts.map