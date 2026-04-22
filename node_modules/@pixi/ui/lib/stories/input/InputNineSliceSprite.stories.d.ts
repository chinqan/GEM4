import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
import type { InputAlign } from '../../Input';
declare const args: {
    text: string;
    placeholder: string;
    secure: boolean;
    align: ("left" | "center" | "right" | null)[];
    textColor: string;
    maxLength: number;
    fontSize: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    amount: number;
    width: number;
    height: number;
    addMask: boolean;
    onChange: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args & {
    align: InputAlign;
};
export declare const UseNineSliceSprite: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=InputNineSliceSprite.stories.d.ts.map