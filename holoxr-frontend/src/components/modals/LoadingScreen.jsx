export default function LoadingScreen({ message = "Loading..." }) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-surface">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-brand border-opacity-80"></div>
                <p className="text-textsec text-sm">{message}</p>
            </div>
        </div>
    );
}
