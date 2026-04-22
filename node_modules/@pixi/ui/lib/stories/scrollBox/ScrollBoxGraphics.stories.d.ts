import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    fontColor: string;
    backgroundColor: string;
    bgBorderColor: string;
    buttonColor: string;
    hoverButtonColor: string;
    pressedButtonColor: string;
    width: number;
    height: number;
    radius: number;
    elementsMargin: number;
    elementsPadding: number;
    elementsWidth: number;
    elementsHeight: number;
    itemsAmount: number;
    disableEasing: boolean;
    globalScroll: boolean;
    shiftScroll: boolean;
    type: ("vertical" | "horizontal" | "bidirectional" | null)[];
    innerListWidth: number;
    onPress: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args & {
    type: 'vertical' | 'horizontal' | 'bidirectional';
};
export declare const UseGraphics: {
    args: {
        type: null;
    };
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=ScrollBoxGraphics.stories.d.ts.map