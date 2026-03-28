import React, { useEffect, useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripeService } from '../../services/stripeService';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../services/stripeService';

interface PaymentFormContentProps {
    amount: number;
    orderId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

const PaymentFormContent: React.FC<PaymentFormContentProps> = ({ amount, orderId, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return; // Stripe.js has not yet loaded.
        }

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Make sure to change this to your payment completion page
                return_url: `${window.location.origin}/checkout_success?orderId=${orderId}`,
            },
            redirect: 'if_required',
        });

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message || "An unexpected error occurred.");
            } else {
                setMessage("An unexpected error occurred.");
            }
            setIsLoading(false);
        } else {
            // Payment succeeded!
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
            </div>

            {message && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                    {message}
                </div>
            )}

            <div className="flex space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !stripe || !elements}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                    {isLoading ? (
                        <span className="flex items-center space-x-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing...</span>
                        </span>
                    ) : (
                        `Pay $${amount.toFixed(2)}`
                    )}
                </button>
            </div>
        </form>
    );
};

interface PaymentFormProps {
    amount: number;
    orderId: string;
    email?: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ amount, orderId, email, onSuccess, onCancel }) => {
    const [clientSecret, setClientSecret] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Create PaymentIntent as soon as the page loads
        stripeService.createPaymentIntent(orderId, amount, email)
            .then((data) => {
                if (data.error) {
                    setError(data.error);
                } else if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                }
            })
            .catch((err) => setError("Failed to initialize payment"));
    }, [amount, orderId, email]);

    if (error) {
        return (
            <div className="text-center py-6">
                <div className="text-red-500 mb-2">Failed to load payment system</div>
                <p className="text-sm text-slate-500 mb-4">{error}</p>
                <button onClick={onCancel} className="bg-slate-200 px-4 py-2 rounded">Close</button>
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
                <p className="text-slate-500">Initializing secure checkout...</p>
            </div>
        );
    }

    const appearance = {
        theme: 'stripe' as const,
        variables: {
            colorPrimary: '#16a34a',
        },
    };

    return (
        <div className="w-full">
            <Elements options={{ clientSecret, appearance }} stripe={stripePromise}>
                <PaymentFormContent
                    amount={amount}
                    orderId={orderId}
                    onSuccess={onSuccess}
                    onCancel={onCancel}
                />
            </Elements>
        </div>
    );
};

export default PaymentForm;
