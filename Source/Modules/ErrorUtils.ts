import { Response } from "express";

export function GenAccountErrorLogin(code: number | string, message: string, res: Response) {
    res.status(400).json({
        message: "Invalid Form Body",
        code: 50035,
        errors: {
            login: {
                _errors: [
                    {
                        code: code,
                        message: message,
                    },
                ],
            },
        },
    });
}

export function GenAccountErrorLoginAll(code: number | string, message: string, res: Response) {
    res.status(400).json({
        message: "Invalid Form Body",
        code: 50035,
        errors: {
            login: {
                _errors: [
                    {
                        code: code,
                        message: message,
                    },
                ],
            },
            password: {
                _errors: [
                    {
                        code: code,
                        message: message,
                    },
                ],
            },
        },
    });
}
