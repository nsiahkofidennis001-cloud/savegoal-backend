export const toNodeHandler = () => {
    return (req: any, res: any) => {
        res.status(200).json({ mocked: true });
    };
};
