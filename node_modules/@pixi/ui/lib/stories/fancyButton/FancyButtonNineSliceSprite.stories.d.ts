import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
import type { ContentFittingMode } from '../../FancyButton';
declare const args: {
    text: string;
    textColor: string;
    padding: number;
    width: number;
    height: number;
    defaultTextScale: number;
    defaultIconScale: number;
    defaultTextAnchorX: number;
    defaultTextAnchorY: number;
    defaultIconAnchorX: number;
    defaultIconAnchorY: number;
    anchorX: number;
    anchorY: number;
    animationDuration: number;
    disabled: boolean;
    contentFittingMode: string[];
    onPress: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args & {
    contentFittingMode: ContentFittingMode;
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
//# sourceMappingURL=FancyButtonNineSliceSprite.stories.d.ts.map