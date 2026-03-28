import React, { useState, useEffect, useCallback, useRef } from "react";
import Modal from "../common/Modal.tsx";
import { Photographer } from "../../types.ts";
import { useCurrency } from "../CurrencyContext.tsx";
import { apiService } from "../../services/apiService.ts";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
  userToEdit: Omit<Photographer, "id"> | Photographer | null;
  availableRoles?: Photographer["role"][];
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  onDataChange,
  userToEdit,
  availableRoles,
}) => {
  const isNewUser = !userToEdit || !("id" in userToEdit);
  const rolesToShow = availableRoles || [
    "Admin",
    "Manager",
    "Team Leader",
    "CEO",
    "Photographer",
  ];
  const defaultRole = rolesToShow[0];

  const getInitialState = useCallback(() => {
    if (userToEdit) return JSON.parse(JSON.stringify(userToEdit));
    return {
      name: "",
      specialty: "",
      avatarUrl: "https://i.imgur.com/3Y2j2s2.png",
      role: defaultRole,
      email: "",
      monthlyTarget: 0,
      dailyPhotoTarget: 0,
      payrollType: "Commission" as const,
      commissionRate: 0.15,
    };
  }, [userToEdit, defaultRole]);

  const [user, setUser] = useState(getInitialState());
  const [password, setPassword] = useState("");
  const [changePassword, setChangePassword] = useState(false);
  const { currency } = useCurrency();
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUser(getInitialState());
      setPassword("");
      setChangePassword(false);
      setIsSaving(false);
    }
  }, [isOpen, getInitialState]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setUser((prev) => {
      const prevUser = { ...prev };
      if (name === "role") {
        return { ...prevUser, role: value as Photographer["role"] };
      }
      if (name === "monthlyTarget") {
        const valueInDisplayCurrency = Number(value);
        const valueInBaseCurrency = valueInDisplayCurrency / currency.rate;
        return { ...prevUser, monthlyTarget: valueInBaseCurrency };
      }
      return { ...prevUser, [name]: value };
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
    // Reset input value to allow re-selection of same file
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isNewUser) {
        // Create user WITH password
        const newUserData: any = { ...user };
        // Remove null values for numeric fields
        if (newUserData.monthlySalary === null)
          delete newUserData.monthlySalary;
        if (newUserData.commissionRate === null)
          delete newUserData.commissionRate;
        if (newUserData.monthlyTarget === null)
          delete newUserData.monthlyTarget;
        if (newUserData.dailyPhotoTarget === null)
          delete newUserData.dailyPhotoTarget;
        if (password) {
          newUserData.password = password;
        }
        // Remove id if present (shouldn't be for new users)
        delete newUserData.id;
        await apiService.createUser(newUserData);
      } else {
        // Update user - only send fields that are defined and should be updated
        const updates: any = {};

        // Only include fields that are defined (not undefined) and not null
        if (user.name !== undefined && user.name !== null)
          updates.name = user.name;
        if (user.email !== undefined && user.email !== null)
          updates.email = user.email;
        if (user.specialty !== undefined && user.specialty !== null)
          updates.specialty = user.specialty;
        if (user.role !== undefined && user.role !== null)
          updates.role = user.role;
        if (user.monthlyTarget !== undefined && user.monthlyTarget !== null)
          updates.monthlyTarget = user.monthlyTarget;
        if (
          user.dailyPhotoTarget !== undefined &&
          user.dailyPhotoTarget !== null
        )
          updates.dailyPhotoTarget = user.dailyPhotoTarget;
        if (user.payrollType !== undefined && user.payrollType !== null)
          updates.payrollType = user.payrollType;
        // For numeric fields, only include if they're not null (allow 0)
        if (user.commissionRate !== undefined && user.commissionRate !== null)
          updates.commissionRate = user.commissionRate;
        if (user.monthlySalary !== undefined && user.monthlySalary !== null)
          updates.monthlySalary = user.monthlySalary;
        if (user.destinationId !== undefined && user.destinationId !== null)
          updates.destinationId = user.destinationId;
        if (user.workingHours !== undefined && user.workingHours !== null)
          updates.workingHours = user.workingHours;

        // Only include avatarUrl if it's set and not empty
        if (user.avatarUrl) {
          updates.avatarUrl = user.avatarUrl;
        }

        // Only include password if user wants to change it
        if (changePassword && password) {
          updates.password = password;
        }

        await apiService.updateUser(user.id, updates);
      }
      onDataChange();
      onClose();
    } catch (err) {
      console.error("Failed to save user", err);
      let errorMessage = "Unknown error";

      if (err instanceof Error) {
        errorMessage = err.message;
        // Check if it's a network error
        if (
          (err as any).isNetworkError ||
          err.message.includes("Failed to fetch") ||
          err.message.includes("Cannot connect")
        ) {
          errorMessage = err.message;
        }
      } else if (typeof err === "object" && err !== null) {
        // Try to extract error message from response
        if ("message" in err) {
          errorMessage = String(err.message);
        } else if ("error" in err) {
          errorMessage = String(err.error);
        }
      }

      // Log full error for debugging
      console.error("Full error object:", err);
      alert(`Failed to save user details: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const displayTarget = (user.monthlyTarget || 0) * currency.rate;
  const inputStyles =
    "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNewUser ? "Add New User" : "Edit User"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative group">
            <img
              src={user.avatarUrl || "https://i.imgur.com/3Y2j2s2.png"}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
            >
              Change
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Profile Picture
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline mt-1"
            >
              Upload New Image
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={user.name}
            onChange={handleChange}
            required
            autoComplete="name"
            className={inputStyles}
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={user.email}
            onChange={handleChange}
            required
            autoComplete="email"
            className={inputStyles}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="specialty"
              className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Specialty
            </label>
            <input
              type="text"
              name="specialty"
              value={user.specialty}
              onChange={handleChange}
              required
              autoComplete="off"
              className={inputStyles}
            />
          </div>
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Role
            </label>
            <select
              name="role"
              value={user.role}
              onChange={handleChange}
              required
              className={inputStyles}
            >
              {rolesToShow.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label
            htmlFor="monthlyTarget"
            className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
          >
            Monthly Sales Target ({currency.code})
          </label>
          <input
            type="number"
            name="monthlyTarget"
            value={displayTarget.toFixed(0)}
            onChange={handleChange}
            autoComplete="off"
            className={inputStyles}
          />
        </div>

        {/* Password Section */}
        {isNewUser ? (
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={inputStyles}
            />
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="changePassword"
                checked={changePassword}
                onChange={(e) => setChangePassword(e.target.checked)}
                className="mr-2 h-4 w-4"
              />
              <label
                htmlFor="changePassword"
                className="text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                Change Password
              </label>
            </div>
            {changePassword && (
              <div className="animate-fadeIn">
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={changePassword}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className={inputStyles}
                />
              </div>
            )}
          </div>
        )}

        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving
              ? "Saving..."
              : isNewUser
                ? "Create User"
                : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserEditModal;
