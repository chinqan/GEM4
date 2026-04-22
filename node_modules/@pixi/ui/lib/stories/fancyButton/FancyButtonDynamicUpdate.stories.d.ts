import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    text: string;
    textColor: string;
    iconOffsetX: number;
    iconOffsetY: number;
    textOffsetX: number;
    textOffsetY: number;
    defaultTextScale: number;
    defaultIconScale: number;
    defaultTextAnchorX: number;
    defaultTextAnchorY: number;
    defaultIconAnchorX: number;
    defaultIconAnchorY: number;
    padding: number;
    anchorX: number;
    anchorY: number;
    disabled: boolean;
    onPress: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args;
export declare const DynamicUpdate: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=FancyButtonDynamicUpdate.stories.d.ts.map