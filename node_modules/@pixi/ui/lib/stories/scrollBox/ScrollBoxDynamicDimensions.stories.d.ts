import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    fontColor: string;
    backgroundColor: string;
    bgBorderColor: string;
    buttonColor: string;
    hoverButtonColor: string;
    pressedButtonColor: string;
    itemsAmount: number;
    type: ("vertical" | "horizontal" | "bidirectional" | null)[];
};
type Args = typeof args & {
    type: 'vertical' | 'horizontal' | 'bidirectional';
};
export declare const UseDynamicDimensions: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=ScrollBoxDynamicDimensions.stories.d.ts.map