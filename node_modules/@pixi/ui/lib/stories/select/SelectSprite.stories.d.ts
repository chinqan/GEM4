import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    dropDownHoverColor: string;
    fontColor: string;
    itemsAmount: number;
    onSelect: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args;
export declare const UseSprite: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=SelectSprite.stories.d.ts.map