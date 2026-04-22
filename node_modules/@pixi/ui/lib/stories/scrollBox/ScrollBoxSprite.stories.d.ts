import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    fontColor: string;
    bgColor: string;
    bgBorderColor: string;
    windowWidth: number;
    windowHeight: number;
    radius: number;
    elementsMargin: number;
    itemsAmount: number;
    disableEasing: boolean;
    type: ("vertical" | "horizontal" | "bidirectional" | null)[];
    onPress: import("@storybook/addon-actions").HandlerFunction;
    globalScroll: boolean;
    shiftScroll: boolean;
};
type Args = typeof args & {
    type: 'vertical' | 'horizontal' | 'bidirectional';
};
export declare const UseSprite: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=ScrollBoxSprite.stories.d.ts.map