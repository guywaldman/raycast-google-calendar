import { Form, ActionPanel, Action, popToRoot, LocalStorage } from "@raycast/api";
import { useState } from "react";

interface AuthFormValues {
  apiKey: string;
}

export default function Auth() {
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();

  function dropPasswordErrorIfNeeded() {
    if (apiKeyError && apiKeyError.length > 0) {
      setApiKeyError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: AuthFormValues) => {
              if (!validateForm(values)) {
                setApiKeyError("API key should not be empty");
                return;
              }
              await LocalStorage.setItem("apiKey", values.apiKey);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="apiKey"
        title="API key"
        error={apiKeyError}
        onChange={dropPasswordErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            if (!validateForm({ apiKey: value })) {
              setApiKeyError("API key should not be empty");
            } else {
              dropPasswordErrorIfNeeded();
            }
          } else {
            setApiKeyError("The field should't be empty!");
          }
        }}
      />
    </Form>
  );
}

function validateForm(values: AuthFormValues) {
  return values.apiKey.trim().length > 0;
}
