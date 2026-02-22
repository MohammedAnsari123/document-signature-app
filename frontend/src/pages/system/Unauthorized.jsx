import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <ShieldAlert className="h-6 w-6 text-red-600" />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h2>
                    <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
                    <div className="mt-6">
                        <Link to="/dashboard" className="text-red-600 hover:text-red-500 font-medium">
                            Go back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
