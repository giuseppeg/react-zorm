import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import React from "react";
import { z } from "zod";

import { useZorm } from "../src";
import { assertNotAny } from "./test-helpers";

test("single field validation", () => {
    const Schema = z.object({
        thing: z.string().min(1),
    });

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input name={zo.fields.thing()} />

                {zo.errors.thing((e) => (
                    <div data-testid="error">{e.code}</div>
                ))}
            </form>
        );
    }

    render(<Test />);

    fireEvent.submit(screen.getByTestId("form"));

    expect(screen.queryByTestId("error")).toHaveTextContent("too_small");
});

test("first blur does not trigger error", () => {
    const Schema = z.object({
        thing: z.string().min(1),
    });

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input data-testid="input" name={zo.fields.thing()} />

                {zo.errors.thing() ? (
                    <div data-testid="error">error</div>
                ) : (
                    <div data-testid="ok">ok</div>
                )}
            </form>
        );
    }

    render(<Test />);

    fireEvent.blur(screen.getByTestId("input"));

    expect(screen.queryByTestId("ok")).toHaveTextContent("ok");
});

test("form is validated on blur after the first submit", () => {
    const Schema = z.object({
        thing: z.string().min(1),
    });

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input data-testid="input" name={zo.fields.thing()} />

                {zo.errors.thing() ? (
                    <div data-testid="error">error</div>
                ) : (
                    <div data-testid="ok">ok</div>
                )}
            </form>
        );
    }

    render(<Test />);

    fireEvent.submit(screen.getByTestId("form"));
    expect(screen.queryByTestId("error")).toHaveTextContent("error");

    userEvent.type(screen.getByTestId("input"), "content");
    fireEvent.blur(screen.getByTestId("input"));

    expect(screen.queryByTestId("ok")).toHaveTextContent("ok");
});

test("form data is validated", () => {
    const Schema = z.object({
        thing: z.string().min(1),
    });

    const spy = jest.fn();

    function Test() {
        const zo = useZorm("form", Schema);

        if (zo.validation?.success) {
            spy(zo.validation.data);
        }

        return (
            <form ref={zo.ref} data-testid="form">
                <input data-testid="input" name={zo.fields.thing()} />
            </form>
        );
    }

    render(<Test />);

    userEvent.type(screen.getByTestId("input"), "content");
    fireEvent.submit(screen.getByTestId("form"));

    expect(spy).toHaveBeenCalledWith({ thing: "content" });
});

test("class name shortcut", () => {
    const Schema = z.object({
        thing: z.string().min(1),
    });

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input
                    data-testid="input"
                    name={zo.fields.thing()}
                    className={zo.errors.thing("errored")}
                />
            </form>
        );
    }

    render(<Test />);

    expect(screen.queryByTestId("input")).not.toHaveClass("errored");

    fireEvent.submit(screen.getByTestId("form"));

    expect(screen.queryByTestId("input")).toHaveClass("errored");
});

test("can get the validation object", () => {
    const Schema = z.object({
        thing: z.string().min(1),
    });

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input name={zo.fields.thing()} />

                <div data-testid="error">{zo.errors.thing()?.code}</div>
            </form>
        );
    }

    render(<Test />);

    fireEvent.submit(screen.getByTestId("form"));

    expect(screen.queryByTestId("error")).toHaveTextContent("too_small");
});

test("can validate multiple dependent fields", () => {
    const Schema = z.object({
        password: z
            .object({
                pw1: z.string(),
                pw2: z.string(),
            })
            .refine(
                (pw) => {
                    return pw.pw1 === pw.pw2;
                },
                { message: "passwords to not match" },
            ),
    });

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input
                    name={zo.fields.password.pw1()}
                    data-testid={zo.fields.password.pw1("id")}
                />
                <input
                    name={zo.fields.password.pw2()}
                    data-testid={zo.fields.password.pw2("id")}
                />

                <div data-testid="error">{zo.errors.password()?.message}</div>
            </form>
        );
    }

    render(<Test />);

    userEvent.type(screen.getByTestId("form:password.pw1"), "foo");
    userEvent.type(screen.getByTestId("form:password.pw2"), "bar");
    fireEvent.submit(screen.getByTestId("form"));

    expect(screen.queryByTestId("error")).toHaveTextContent(
        "passwords to not match",
    );
});

test("can validate multiple dependent root fields", () => {
    const Schema = z
        .object({
            pw1: z.string(),
            pw2: z.string(),
        })
        .refine(
            (pw) => {
                return pw.pw1 === pw.pw2;
            },
            { message: "passwords to not match" },
        );

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input
                    name={zo.fields.pw1()}
                    data-testid={zo.fields.pw1("id")}
                />

                <input
                    name={zo.fields.pw2()}
                    data-testid={zo.fields.pw2("id")}
                />

                <div data-testid="error">{zo.errors()?.message}</div>
            </form>
        );
    }

    render(<Test />);

    userEvent.type(screen.getByTestId("form:pw1"), "foo");
    userEvent.type(screen.getByTestId("form:pw2"), "bar");
    fireEvent.submit(screen.getByTestId("form"));

    expect(screen.queryByTestId("error")).toHaveTextContent(
        "passwords to not match",
    );
});

test("can parse array of strings", () => {
    const Schema = z.object({
        strings: z.array(z.string().min(2)),
    });

    const spy = jest.fn();

    function Test() {
        const zo = useZorm("form", Schema);

        if (zo.validation?.success) {
            spy(zo.validation.data);
        }

        return (
            <form ref={zo.ref} data-testid="form">
                <input
                    name={zo.fields.strings(0)("name")}
                    defaultValue="ding"
                />
                <input
                    name={zo.fields.strings(1)("name")}
                    defaultValue="dong"
                />
            </form>
        );
    }

    render(<Test />);

    fireEvent.submit(screen.getByTestId("form"));

    expect(spy).toHaveBeenCalledWith({ strings: ["ding", "dong"] });
});

test("can validate array of strings on individual items", () => {
    const Schema = z.object({
        strings: z.array(z.string().min(2)),
    });

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input
                    name={zo.fields.strings(0)("name")}
                    defaultValue="ding"
                />
                <input name={zo.fields.strings(1)("name")} defaultValue="d" />
                <div data-testid="error">{zo.errors.strings(1)()?.message}</div>
            </form>
        );
    }

    render(<Test />);

    fireEvent.submit(screen.getByTestId("form"));

    expect(screen.queryByTestId("error")).toHaveTextContent(
        "Should be at least 2 characters",
    );
});

test("can validate array of strings", () => {
    const Schema = z.object({
        strings: z.array(z.string()).min(2),
    });

    function Test() {
        const zo = useZorm("form", Schema);

        return (
            <form ref={zo.ref} data-testid="form">
                <input
                    name={zo.fields.strings(0)("name")}
                    defaultValue="ding"
                />
                <div data-testid="error">{zo.errors.strings()?.message}</div>
            </form>
        );
    }

    render(<Test />);

    fireEvent.submit(screen.getByTestId("form"));

    expect(screen.queryByTestId("error")).toHaveTextContent(
        "Should have at least 2 items",
    );
});

test("onOnValidSubmit is called on first valid submit", () => {
    const spy = jest.fn();

    const Schema = z.object({
        thing: z.string().min(1),
    });

    function Test() {
        const zo = useZorm("form", Schema, {
            onValidSubmit(e) {
                spy(e.data);
            },
        });

        return (
            <form ref={zo.ref} data-testid="form">
                <input data-testid="input" name={zo.fields.thing()} />
            </form>
        );
    }

    render(<Test />);

    userEvent.type(screen.getByTestId("input"), "content");
    fireEvent.submit(screen.getByTestId("form"));
    expect(spy).toHaveBeenCalledWith({ thing: "content" });
});

test("onOnValidSubmit is not called on error submit", () => {
    const spy = jest.fn();

    const Schema = z.object({
        thing: z.string().min(10),
    });

    function Test() {
        const zo = useZorm("form", Schema, {
            onValidSubmit(e) {
                assertNotAny(e.data);
                assertNotAny(e.data.thing);
                const val: string = e.data.thing;

                // @ts-expect-error
                e.data.bad;

                spy();
            },
        });

        return (
            <form ref={zo.ref} data-testid="form">
                <input data-testid="input" name={zo.fields.thing()} />
            </form>
        );
    }

    render(<Test />);

    userEvent.type(screen.getByTestId("input"), "short");
    fireEvent.submit(screen.getByTestId("form"));
    expect(spy).toHaveBeenCalledTimes(0);

    userEvent.type(screen.getByTestId("input"), "looooooooooooooooooooooong");
    fireEvent.submit(screen.getByTestId("form"));
    expect(spy).toHaveBeenCalledTimes(1);
});

test("setupListeners: false", () => {
    const spy = jest.fn();

    const Schema = z.object({
        thing: z.string().min(10),
    });

    function Test() {
        const zo = useZorm("form", Schema, {
            setupListeners: false,
            onValidSubmit() {
                spy();
            },
        });

        return (
            <form ref={zo.ref} data-testid="form">
                <input data-testid="input" name={zo.fields.thing()} />
                <div data-testid="status">
                    {zo.errors.thing() ? "error" : "ok"}
                </div>
            </form>
        );
    }

    render(<Test />);

    // Does not update ok status to error because no listeners
    userEvent.type(screen.getByTestId("input"), "short");
    fireEvent.submit(screen.getByTestId("form"));
    expect(spy).toHaveBeenCalledTimes(0);
    expect(screen.getByTestId("status")).toHaveTextContent("ok");

    // No change here
    userEvent.type(screen.getByTestId("input"), "looooooooooooooooooooooong");
    fireEvent.blur(screen.getByTestId("input"));
    expect(screen.getByTestId("status")).toHaveTextContent("ok");

    // Or here
    fireEvent.submit(screen.getByTestId("form"));
    expect(spy).toHaveBeenCalledTimes(0);
});

test("checkbox arrays", async () => {
    const spy = jest.fn();
    interface Color {
        name: string;
        code: string;
    }

    const COLORS: Color[] = [
        {
            name: "Red",
            code: "red",
        },
        {
            name: "Green",
            code: "green",
        },
        {
            name: "Blue",
            code: "blue",
        },
    ];

    const FormSchema = z.object({
        colors: z
            .array(z.string().nullish())
            .transform((a) => a.flatMap((item) => (item ? item : []))),
    });

    function Test() {
        const zo = useZorm("signup", FormSchema, {
            onValidSubmit(e) {
                e.preventDefault();
                spy(e.data);
            },
        });

        return (
            <form ref={zo.ref} data-testid="form">
                {COLORS.map((color, index) => {
                    return (
                        <div key={color.code}>
                            <input
                                type="checkbox"
                                id={zo.fields.colors(index)("id")}
                                name={zo.fields.colors(index)("name")}
                                defaultChecked={index === 1}
                                value={color.code}
                            />
                            <label htmlFor={zo.fields.colors(index)("id")}>
                                {color.name}
                            </label>
                        </div>
                    );
                })}
            </form>
        );
    }

    render(<Test />);

    fireEvent.submit(screen.getByTestId("form"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ colors: ["green"] });
});

test("can read input value with values chain", () => {
    const Schema = z.object({
        thing: z.string().min(1),
    });
    const spy = jest.fn();

    function Test() {
        const zo = useZorm("form", Schema);

        () => {
            // @ts-expect-error
            zo.values.bad();

            // @ts-expect-error
            zo.values.thing("bad");

            // @ts-expect-error
            zo.values.thing(3);
        };

        return (
            <form ref={zo.ref} data-testid="form">
                <input name={zo.fields.thing()} defaultValue="value" />
                <button
                    type="button"
                    onClick={() => {
                        assertNotAny(zo.values.thing());
                        spy(zo.values.thing());
                    }}
                >
                    click
                </button>
            </form>
        );
    }

    render(<Test />);

    fireEvent.click(screen.getByText("click"));

    expect(spy).toHaveBeenCalledWith("value");
});

test("can read nested value", () => {
    const Schema = z.object({
        things: z.array(
            z.object({
                ding: z.string().min(1),
            }),
        ),
        nest: z.object({
            dong: z.string(),
        }),
    });
    const spy = jest.fn();

    function Test() {
        const zo = useZorm("form", Schema);

        () => {
            // @ts-expect-error
            zo.values.things();

            // @ts-expect-error
            zo.values.things("");

            // @ts-expect-error
            zo.values.things(0).bad;

            // @ts-expect-error
            zo.values.nest();
            zo.values.nest.dong();
        };

        return (
            <form ref={zo.ref} data-testid="form">
                <input name={zo.fields.things(0).ding()} defaultValue="value" />
                <button
                    type="button"
                    onClick={() => {
                        assertNotAny(zo.values.things(0).ding());
                        spy(zo.values.things(0).ding());
                    }}
                >
                    click
                </button>
            </form>
        );
    }

    render(<Test />);

    fireEvent.click(screen.getByText("click"));

    expect(spy).toHaveBeenCalledWith("value");
});
