export default function LoadingScreen({ message = "Loading..." }) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50"></div>
                <p className="text-gray-500 text-sm">{message}</p>
            </div>
        </div>
    );
}
