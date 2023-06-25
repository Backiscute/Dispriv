import Editor, { EditorProps, loader } from "@monaco-editor/react";
import { useState, useRef } from "react";
import path from "path";

// https://github.com/microsoft/monaco-editor-samples/blob/master/electron-amd-nodeIntegration/electron-index.html
function uriFromPath(_path: string) {
    let pathName = path.resolve(_path).replace(/\\/g, "/");

    if (pathName.length > 0 && pathName.charAt(0) !== "/") {
        pathName = `/${pathName}`;
    }
    return encodeURI(`file://${pathName}`);
}

loader.config({
    paths: {
        vs: uriFromPath(path.join(__dirname, "../../../../../../node_modules/monaco-editor/min/vs")),
    },
});

export default function MonacoEditorComponent({
    defaultValue,
    defaultLanguage,
    defaultPath,
    value,
    language,
    path,
    theme,
    line,
    loading,
    options,
    overrideServices,
    saveViewState,
    keepCurrentModel,
    width,
    height,
    className,
    wrapperProps,
    beforeMount,
    onMount,
    onChange,
    onValidate,
}: EditorProps) {
    const [isEditorReady, setIsEditorReady] = useState(false);
    const valueGetter = useRef(null);

    function handleEditorDidMount(_valueGetter: any) {
        setIsEditorReady(true);
        valueGetter.current = _valueGetter;
    }

    return (
        <>
            <Editor
                defaultValue={defaultValue}
                defaultLanguage={defaultLanguage}
                defaultPath={defaultPath}
                value={value}
                language={language}
                path={path}
                theme={theme}
                line={line}
                loading={loading}
                options={options}
                overrideServices={overrideServices}
                saveViewState={saveViewState}
                keepCurrentModel={keepCurrentModel}
                width={width}
                height={height}
                className={className}
                wrapperProps={wrapperProps}
                beforeMount={beforeMount}
                onMount={onMount}
                onChange={onChange}
                onValidate={onValidate}
            />
        </>
    );
}

