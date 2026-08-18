# Implementation Questions for @finstreet/ui Interactive List

This document should help you to gather information to create a detailed implementation plan for an InteractiveList. Follow this guide step by step and ask the user about the needed information

## The Plan

- [] To which feature does this InteractiveList belong to
- [] What type do the items of the InteractiveList have
- [] Which columns are needed for the `gridAreaTemplates`
- [] What are the german titles for the columns
- [] How should we display the data in each column
- [] Any special display if there is no data available
- [] What should happen `onItemInteract`

## Detailed Questionnaire

### 1. To which feature does this InteractiveList belong to

We need the name of the feature to determine the path later on.

### 2. What type do the items of the InteractiveList have

This should be the TypeScript types that we can later use - the type should go in the same file as the InteractiveList component

### 3. Which columns are needed for the `gridAreaTemplates`?

The `gridTemplateAreas` define how much space each of the columns get. We are working with a 12-column-grid here. If nothing is mentioned divide the space evenly for each column - if you cannot distribute it evenly due to the number of columns choose with your own discretion.

Example:

```ts
const gridTemplateAreas =
  '"inquiry inquiry details details details product product status status contactperson contactperson contactperson"';
```

### 4. How shoul we display the data in each column?

Get a detailed description how the data display for each column should look like

### 5. Any special display if there is no data available?

What should we display if there is no data at the moment

### 6. What should happen `onItemInteract`?

When the user clicks on an item what should happen?

After the user answered all of these questions I want you to get the component InteractiveList from the finstreet-mcp and create the component.

### Implementation Notes

- Before you start with the implementation check the @Claude.md file if there is an reference for the directory strucutre in the project and follow these guidelines
- Do not use the useTranslations hook if the user did not give you the specific permission. Most of the time you just hardcode the values
