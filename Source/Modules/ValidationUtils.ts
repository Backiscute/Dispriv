import { Request, Response, NextFunction } from "express";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { ZodArray, ZodObject } from "zod";

export function handleError(
    err: TypeError,
    req: Request,
    res: Response,
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    next: NextFunction
) {
    res.status(500).json({ code: JsonErrorCodes.GENERAL_ERROR, message: "Internal Server Error" });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ValidateRequest(Schema: ZodObject<any> | ZodArray<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.body) return res.status(400).json({ code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE, message: "Invalid Form Body" });

        const Result = Schema.safeParse(req.body);

        if (!Result.success)
        {
            const Errors = Result.error.errors.reduce((acc, error) => {
                const Property = error.path[0];
                if (!Object.hasOwnProperty.call(acc, Property))
                {
                    acc[Property] = {
                        _errors: [
                            {
                                code: error.code,
                                message: error.message
                            }
                        ]
                    };
                }
                else
                {
                    acc[Property]._errors.push({
                        code: error.code,
                        message: error.message
                    });
                }
                return acc;
            }, {} as {[key: string]: {_errors: {code: string, message: string}[]}});

            return res.status(400).json({ code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE, message: "Invalid Form Body", errors: Errors });
        }

        next();
    };
}