type Types = {
    [name: string]: object | number | string | boolean;
};
/**
 * Generates Storybook argTypes configuration based on argument values
 * @param args - Object containing default argument values
 * @returns Object with Storybook argTypes configuration
 */
export declare const argTypes: (args: Types) => any;
/**
 * Extracts default values from arguments for Storybook
 * @param args - Object containing argument values
 * @returns Object with default values for each argument
 */
export declare const getDefaultArgs: (args: Types) => any;
export {};
//# sourceMappingURL=argTypes.d.ts.map