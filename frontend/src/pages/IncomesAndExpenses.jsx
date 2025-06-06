import React, { useEffect, useState } from "react";
import config from "../config/config";
import DateFilter from "../services/Filter/DateFilter";
import { useOperations } from "../services/Filter/Operations";
import { Link } from "react-router-dom";
import Popup from "../components/Popup";
import { getPopupMessage } from "../services/Popup";
import { useBalanceContext } from "../services/BalanceContext";

function IncomesAndExpenses() {
    const { fetchBalance } = useBalanceContext();
    const [categories, setCategories] = useState({ income: [], expense: [] });
    const [dateFilter, setDateFilter] = useState("today");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const { filteredOperations } = useOperations(dateFilter, startDate, endDate, reloadTrigger);

    const [showPopup, setShowPopup] = useState(false);
    const [deleteType, setDeleteType] = useState("");
    const [operationToDelete, setOperationToDelete] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            let url = `${config.host}/api/categories`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": token
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch categories");
            }

            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const getCategoryTitle = (operation) => {
        if (operation.type === "income" && operation.income_id) {
            const category = categories.income.find(cat => cat.income_id === operation.income_id);
            return category ? category.title : "Unknown";
        }
        if (operation.type === "expense" && operation.expense_id) {
            const category = categories.expense.find(cat => cat.expense_id === operation.expense_id);
            return category ? category.title : "Unknown";
        }
        return "N/A";
    };


    const handleDelete = (operationId, type) => {
        setOperationToDelete(operationId);
        setDeleteType(type);
        setShowPopup(true);
    };

    const confirmDelete = async () => {
        if (!operationToDelete) return;

        try {
            const token = localStorage.getItem("accessToken");
            // Delete
            const response = await fetch(`${config.host}/api/operations/${operationToDelete}`, {
                method: "DELETE",
                headers: { "x-auth-token": token },
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(" Error deleting operation:", data);
                return;
            }

            // updating backend balance
            await fetch(`${config.host}/api/balance`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": token
                }
            });

            // refreshing balance
            await fetchBalance();

            setOperationToDelete(null);
            setShowPopup(false);
            setReloadTrigger(prev => prev + 1);

        } catch (error) {
            console.error("Error deleting operation:", error);
        }
    };

    return (
        <div className="container my-5">
            <h1 className="main-page-title">Income & Expenses</h1>

            <div className="main-page-item-options-create mb-5">
                <Link to="/incomeAndExpensesCreation?type=income" className="btn btn-success me-2 mb-1">
                    Create Income
                </Link>
                <Link to="/incomeAndExpensesCreation?type=expense" className="btn btn-danger mb-1">
                    Create Expense
                </Link>
            </div>

            {/* Date Filtering Component */}
            <DateFilter onFilterChange={(filter, start, end) => {
                setDateFilter(filter);
                setStartDate(start);
                setEndDate(end);
            }} />

            {/* showing "No Operations" Message if No Data */}
            {filteredOperations.length === 0 ? (
                <div className="alert alert-warning text-center my-4">
                    No operations found for the selected date range.
                </div>
            ) : (
                <div className="row pl-40">
                    <div className="table-responsive-xxl">
                        <table className="table">
                            <thead className="table-head">
                            <tr>
                                <th>Operation ID</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Comment</th>
                                <th>Actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            {filteredOperations.map((operation) => (
                                <tr key={operation.operation_id}>
                                    <td>{operation.operation_id}</td>
                                    <td className={operation.type === "income" ? "text-success" : "text-danger"}>
                                        {operation.type}
                                    </td>
                                    <td>{getCategoryTitle(operation)}</td>
                                    <td className={operation.type === "income" ? "text-success" : "text-danger"}>
                                        £{operation.amount}
                                    </td>
                                    <td>{operation.date}</td>
                                    <td>{operation.comment || "No Comment"}</td>
                                    <td>
                                        <a href={`/incomeAndExpensesEdit/${operation.operation_id}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"
                                                 fill="none">
                                                <path d="M12.1465 0.146447C12.3417 -0.0488155 12.6583 -0.0488155 12.8536 0.146447L15.8536 3.14645C16.0488 3.34171 16.0488 3.65829 15.8536 3.85355L5.85357 13.8536C5.80569 13.9014 5.74858 13.9391 5.68571 13.9642L0.68571 15.9642C0.500001 16.0385 0.287892 15.995 0.146461 15.8536C0.00502989 15.7121 -0.0385071 15.5 0.0357762 15.3143L2.03578 10.3143C2.06092 10.2514 2.09858 10.1943 2.14646 10.1464L12.1465 0.146447ZM11.2071 2.5L13.5 4.79289L14.7929 3.5L12.5 1.20711L11.2071 2.5ZM12.7929 5.5L10.5 3.20711L4.00001 9.70711V10H4.50001C4.77616 10 5.00001 10.2239 5.00001 10.5V11H5.50001C5.77616 11 6.00001 11.2239 6.00001 11.5V12H6.29291L12.7929 5.5ZM3.03167 10.6755L2.92614 10.781L1.39754 14.6025L5.21903 13.0739L5.32456 12.9683C5.13496 12.8973 5.00001 12.7144 5.00001 12.5V12H4.50001C4.22387 12 4.00001 11.7761 4.00001 11.5V11H3.50001C3.28561 11 3.10272 10.865 3.03167 10.6755Z"
                                                      fill="black"/>
                                            </svg>
                                        </a>
                                        <button
                                            className="btn"
                                            onClick={() => handleDelete(operation.operation_id, "operation")}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="15" viewBox="0 0 14 15"
                                                 fill="none">
                                                <path d="M4.5 5.5C4.77614 5.5 5 5.72386 5 6V12C5 12.2761 4.77614 12.5 4.5 12.5C4.22386 12.5 4 12.2761 4 12V6C4 5.72386 4.22386 5.5 4.5 5.5Z"
                                                      fill="black"/>
                                                <path d="M7 5.5C7.27614 5.5 7.5 5.72386 7.5 6V12C7.5 12.2761 7.27614 12.5 7 12.5C6.72386 12.5 6.5 12.2761 6.5 12V6C6.5 5.72386 6.72386 5.5 7 5.5Z"
                                                      fill="black"/>
                                                <path d="M10 6C10 5.72386 9.77614 5.5 9.5 5.5C9.22386 5.5 9 5.72386 9 6V12C9 12.2761 9.22386 12.5 9.5 12.5C9.77614 12.5 10 12.2761 10 12V6Z"
                                                      fill="black"/>
                                                <path fill-rule="evenodd" clip-rule="evenodd"
                                                      d="M13.5 3C13.5 3.55228 13.0523 4 12.5 4H12V13C12 14.1046 11.1046 15 10 15H4C2.89543 15 2 14.1046 2 13V4H1.5C0.947715 4 0.5 3.55228 0.5 3V2C0.5 1.44772 0.947715 1 1.5 1H5C5 0.447715 5.44772 0 6 0H8C8.55229 0 9 0.447715 9 1H12.5C13.0523 1 13.5 1.44772 13.5 2V3ZM3.11803 4L3 4.05902V13C3 13.5523 3.44772 14 4 14H10C10.5523 14 11 13.5523 11 13V4.05902L10.882 4H3.11803ZM1.5 3V2H12.5V3H1.5Z"
                                                      fill="black"/>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delete Popup */}
            {showPopup && (
                <Popup
                    message={getPopupMessage(deleteType)}
                    onConfirm={confirmDelete}
                    onCancel={() => setShowPopup(false)}
                />
            )}
        </div>
    );
}

export default IncomesAndExpenses;
