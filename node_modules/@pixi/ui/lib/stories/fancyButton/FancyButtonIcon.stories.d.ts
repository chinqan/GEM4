import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    width: number;
    height: number;
    padding: number;
    radius: number;
    iconOffsetX: number;
    iconOffsetY: number;
    defaultIconScale: number;
    defaultIconAnchorX: number;
    defaultIconAnchorY: number;
    defaultOffset: number;
    hoverOffset: number;
    pressedOffset: number;
    disabledOffset: number;
    animationDuration: number;
    anchorX: number;
    anchorY: number;
    disabled: boolean;
    action: import("@storybook/addon-actions").HandlerFunction;
    color: string;
    hoverColor: string;
    pressedColor: string;
    disabledColor: string;
    textColor: string;
    pannelColor: string;
    pannelBorderColor: string;
};
type Args = typeof args;
export declare const UseIcon: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=FancyButtonIcon.stories.d.ts.map