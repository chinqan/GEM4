import { PixiStory } from '@pixi/storybook-renderer';
import { ListType } from '../../List';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    type: ("vertical" | "horizontal" | "bidirectional" | null)[];
    fontColor: string;
    bgColor: string;
    bgBorderColor: string;
    buttonColor: string;
    hoverButtonColor: string;
    pressedButtonColor: string;
    width: number;
    height: number;
    radius: number;
    elementsMargin: number;
    topPadding: number;
    leftPadding: number;
    rightPadding: number;
    elementsWidth: number;
    elementsHeight: number;
    itemsAmount: number;
    onPress: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args & {
    type: ListType;
};
export declare const UseGraphics: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=ListGraphics.stories.d.ts.map