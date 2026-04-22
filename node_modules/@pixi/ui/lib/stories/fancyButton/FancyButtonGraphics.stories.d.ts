import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    width: number;
    height: number;
    padding: number;
    radius: number;
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
    defaultOffsetY: number;
    hoverOffsetY: number;
    pressedOffsetY: number;
    disabledOffsetY: number;
    anchorX: number;
    anchorY: number;
    animationDuration: number;
    disabled: boolean;
    action: import("@storybook/addon-actions").HandlerFunction;
    color: string;
    hoverColor: string;
    pressedColor: string;
    disabledColor: string;
    textColor: string;
    pannelColor: string;
    pannelBorderColor: string;
    text: string;
};
type Args = typeof args;
export declare const UseGraphics: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=FancyButtonGraphics.stories.d.ts.map