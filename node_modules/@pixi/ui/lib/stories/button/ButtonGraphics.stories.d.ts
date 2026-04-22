import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    width: number;
    height: number;
    radius: number;
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
//# sourceMappingURL=ButtonGraphics.stories.d.ts.map