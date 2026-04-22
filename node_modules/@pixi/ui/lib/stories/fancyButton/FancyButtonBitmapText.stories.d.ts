import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    text: string;
    textColor: string;
    padding: number;
    textOffsetX: number;
    textOffsetY: number;
    defaultTextScale: number;
    defaultTextAnchorX: number;
    defaultTextAnchorY: number;
    anchorX: number;
    anchorY: number;
    animationDuration: number;
    disabled: boolean;
    onPress: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args;
export declare const UsingSpriteAndBitmapText: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=FancyButtonBitmapText.stories.d.ts.map