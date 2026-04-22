import { PixiStory } from '@pixi/storybook-renderer';
import { ButtonEvent } from '../../utils/HelpTypes';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    triggerEvent1: readonly ["onPress", "onDown", "onUp", "onHover", "onOut", "onUpOut"];
    triggerEvent2: string[];
    triggerEvent3: string[];
    action: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args & {
    triggerEvent1: ButtonEvent;
    triggerEvent2: ButtonEvent;
    triggerEvent3: ButtonEvent;
};
export declare const Sprites: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=Switcher.stories.d.ts.map