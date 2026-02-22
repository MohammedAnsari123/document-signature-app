import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                        <FileQuestion className="h-6 w-6 text-blue-600" />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">Page Not Found</h2>
                    <p className="mt-2 text-gray-600">The page you are looking for does not exist.</p>
                    <div className="mt-6">
                        <Link to="/dashboard" className="text-blue-600 hover:text-blue-500 font-medium">
                            Go back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
