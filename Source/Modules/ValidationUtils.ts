import { Request, Response, NextFunction } from "express";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { ZodObject } from "zod";

export function handleError(
    err: TypeError,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    res.status(500).json({ code: JsonErrorCodes.GENERAL_ERROR, message: "Internal Server Error" });
};

export function ValidateRequest(req: Request, res: Response, next: NextFunction, Schema: ZodObject<any>) {
    if (!req.body) return res.status(400).json({ code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE, message: "Invalid Form Body" });

    const Result = Schema.safeParse(req.body);

    if (!Result.success)
    {
        const Errors = Result.error.errors.reduce((acc, error) => {
            const Property = error.path[0] as any;
            if (!acc.hasOwnProperty(Property))
            {
                acc[Property] = {
                    _errors: [
                        {
                            code: error.code,
                            message: error.message
                        }
                    ]
                }
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
}