export interface fileRVIA {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: fileRVIABuffer;
    size: number;
}

export interface fileRVIABuffer {
    type: 'Buffer',
    data: Array<any>
}