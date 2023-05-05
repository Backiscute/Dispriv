export function GenAccountErrorLogin(code, message, res) {
    res.status(400).json(
        {
            "message": "Invalid Form Body",
            "code": 50035,
            "errors": {
                "login": {
                    "_errors": [
                        {
                            "code": code,
                            "message": message
                        }
                    ]
                }
            }
        }
    );
}

export function GenAccountErrorLoginAll(code, message, res) {
    res.status(400).json(
        {
            "message": "Invalid Form Body",
            "code": 50035,
            "errors": {
                "login": {
                    "_errors": [
                        {
                            "code": code,
                            "message": message
                        }
                    ]
                },
                "password": {
                    "_errors": [
                        {
                            "code": code,
                            "message": message
                        }
                    ]
                }
            }
        }
    );
}