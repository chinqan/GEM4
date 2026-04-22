import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    text: string;
    textColor: string;
    color: string;
    borderColor: string;
    fillBorderColor: string;
    fillColor: string;
    width: number;
    height: number;
    radius: number;
    amount: number;
    useHTMLtext: boolean;
    onPress: import("@storybook/addon-actions").HandlerFunction;
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
//# sourceMappingURL=CheckBoxGraphics.stories.d.ts.map