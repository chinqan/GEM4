import { PixiStory, StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    width: number;
    height: number;
    padding: number;
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
export declare const NineSliceBackground: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
    args: any;
};
export declare const NineSliceConfirm: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
    args: any;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=DialogNineSlice.stories.d.ts.map