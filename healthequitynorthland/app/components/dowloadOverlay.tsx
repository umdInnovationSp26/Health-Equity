import * as React from "react";




export default function downloadOverlay() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-lg bg-white p-8 text-center">
                <h2 className="mb-4 text-xl font-semibold">Please choose data export format</h2>
                <p className="mb-4">Select the format in which you would like to download the data.</p>
                <div className="flex justify-center gap-4">
                     <button className="rounded-md bg-blue-500 text-white px-4 py-2 hover:bg-blue-600">
                        Download as PDF
                    </button>
                    <button className="rounded-md bg-blue-500 text-white px-4 py-2 hover:bg-blue-600">
                        Download as CSV
                    </button>
                    <button className="rounded-md bg-green-500 text-white px-4 py-2 hover:bg-green-600">
                        Download as Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
