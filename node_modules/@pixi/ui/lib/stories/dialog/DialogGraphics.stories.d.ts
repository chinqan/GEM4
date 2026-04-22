import { PixiStory, StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    width: number;
    height: number;
    radius: number;
    padding: number;
    backgroundColor: string;
    backgroundBorderColor: string;
    backdropColor: string;
    backdropAlpha: number;
    titleColor: string;
    contentColor: string;
    buttonColor: string;
    buttonHoverColor: string;
    buttonPressedColor: string;
    closeOnBackdropClick: boolean;
};
type Args = typeof args;
export declare const SimpleAlert: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
    args: any;
};
export declare const ConfirmDialog: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
    args: any;
};
export declare const ThreeButtons: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
    args: any;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=DialogGraphics.stories.d.ts.map