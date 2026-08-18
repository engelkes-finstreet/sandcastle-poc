# Build Modals

You will receive instructions how to build one or multiple modals from the user in your $ARGUMENTS

## Preparation

Before you start with the implementation check the paths for the components that the modals should use. There might be some slight typos. Pass the correct
name of the component to the agents and show them the correct import paths for these components. You can consult the @agent-project-structure-agent for
this. Get the correct component names and their import paths and pass them down to the agents as their context

## Implementation

Implement each modal using the modal-creator agent and run them in parallel

## Clean up

After you are done check if all translations are correctly implemented with @agent-translations-expert
The translations-expert should check all files for used translations and verify that they are correct and if not add them.
