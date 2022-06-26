import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZodType, ZodError, ZodCustomIssue, ZodIssue } from "zod";
import { errorChain, fieldChain } from "./chains";
import { safeParseForm } from "./parse-form";
import { Zorm } from "./types";

export interface ValidSubmitEvent<Data> {
    /**
     * Prevent the default form submission
     */
    preventDefault(): void;

    /**
     * The form HTML Element
     */
    target: HTMLFormElement;

    /**
     * Zod validated and parsed data
     */
    data: Data;
}

export interface UseZormOptions<Data> {
    /**
     * Called when the form is submitted with valid data
     */
    onValidSubmit?: (event: ValidSubmitEvent<Data>) => any;

    setupListeners?: boolean;

    customIssues?: ZodIssue[];
}

export function useZorm<Schema extends ZodType<any>>(
    formName: string,
    schema: Schema,
    options?: UseZormOptions<ReturnType<Schema["parse"]>>,
): Zorm<Schema> {
    type ValidationResult = ReturnType<Schema["safeParse"]>;

    const formRef = useRef<HTMLFormElement>();
    const submittedOnceRef = useRef(false);
    const submitRef = useRef<
        UseZormOptions<ValidationResult>["onValidSubmit"] | undefined
    >(options?.onValidSubmit);
    submitRef.current = options?.onValidSubmit;

    const [validation, setValidation] = useState<ValidationResult | null>(null);

    const getForm = useCallback(() => {
        if (!formRef.current) {
            throw new Error("[react-zorm]: Form ref not passed");
        }
        return formRef.current;
    }, []);

    const validate = useCallback(() => {
        const res = safeParseForm(schema, getForm());
        setValidation(res);
        return res;
    }, [getForm, schema]);

    const changeHandler = useCallback(() => {
        if (!submittedOnceRef.current) {
            return;
        }

        validate();
    }, [validate]);

    const submitHandler = useCallback(
        (e: { preventDefault(): any }) => {
            submittedOnceRef.current = true;
            const validation = validate();

            if (!validation.success) {
                e.preventDefault();
            } else {
                submitRef.current?.({
                    data: validation.data,
                    target: getForm(),
                    preventDefault: () => {
                        e.preventDefault();
                    },
                });
            }
        },
        [getForm, validate],
    );

    const callbackRef = useCallback(
        (form: HTMLFormElement | undefined) => {
            if (form !== formRef.current) {
                if (formRef.current) {
                    formRef.current.removeEventListener(
                        "change",
                        changeHandler,
                    );
                    formRef.current.removeEventListener(
                        "submit",
                        submitHandler,
                    );
                }

                if (form && options?.setupListeners !== false) {
                    form.addEventListener("change", changeHandler);
                    form.addEventListener("submit", submitHandler);
                }
                formRef.current = form;
            }
        },
        [changeHandler, options?.setupListeners, submitHandler],
    );

    return useMemo(() => {
        let customIssues = options?.customIssues ?? [];
        let error = !validation?.success ? validation?.error : undefined;

        const errors = errorChain(schema, [
            ...(error?.issues ?? []),
            ...customIssues,
        ]);

        const fields = fieldChain(formName, schema);

        return {
            ref: callbackRef as any,
            validate,
            validation,
            fields,
            errors,
            customIssues: customIssues,
        };
    }, [
        callbackRef,
        formName,
        options?.customIssues,
        schema,
        validate,
        validation,
    ]);
}
