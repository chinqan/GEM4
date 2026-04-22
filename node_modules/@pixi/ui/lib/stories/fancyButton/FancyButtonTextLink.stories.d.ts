import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    text: string;
    textColor: string;
    animationDuration: number;
    disabled: boolean;
    onPress: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args;
export declare const TextLink: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=FancyButtonTextLink.stories.d.ts.map