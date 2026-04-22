import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
import type { InputAlign } from '../../Input';
declare const args: {
    text: string;
    placeholder: string;
    secure: boolean;
    align: ("left" | "center" | "right" | null)[];
    textColor: string;
    backgroundColor: string;
    borderColor: string;
    maxLength: number;
    fontSize: number;
    border: number;
    width: number;
    height: number;
    radius: number;
    amount: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    cleanOnFocus: boolean;
    addMask: boolean;
    onChange: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args & {
    align: InputAlign;
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
//# sourceMappingURL=InputGraphics.stories.d.ts.map