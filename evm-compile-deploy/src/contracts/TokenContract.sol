// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

contract TokenContract is AccessControl, OFT {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    )
        OFT(_name, _symbol, _lzEndpoint, _delegate)
        Ownable(_delegate)
    {
        // Grant roles to the initial owner
        _grantRole(DEFAULT_ADMIN_ROLE, _delegate);
        _grantRole(BRIDGE_ROLE, _delegate);
    }

    /**
     * @notice Mint tokens.
     * @dev Only accounts with BRIDGE_ROLE OR DEFAULT_ADMIN_ROLE can call.
     */
    function mint(address to, uint256 amount)
        external
        onlyBridgeOrAdmin
    {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens.
     * @dev Only accounts with BRIDGE_ROLE OR DEFAULT_ADMIN_ROLE can call.
     */
    function burnFrom(address from, uint256 amount)
        external
        onlyBridgeOrAdmin
    {
        _burn(from, amount);
    }

    /**
     * @dev If you want a convenience function for "transferring ownership" in AccessControl terms:
     *      grant the DEFAULT_ADMIN_ROLE to the newAdmin, then revoke it from yourself.
     */
    function transferAdminRole(address newAdmin)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Convenience function for transferring the BRIDGE_ROLE:
     *      grants the BRIDGE_ROLE to the newBridgeAdmin, then revokes it from the specified oldBridgeAdmin.
     *      Can only be called by accounts with the DEFAULT_ADMIN_ROLE.
     * @param newBridgeAdmin The address to be granted the BRIDGE_ROLE.
     * @param oldBridgeAdmin The address to have the BRIDGE_ROLE revoked.
     */
    function transferBridgeRole(address newBridgeAdmin, address oldBridgeAdmin)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(BRIDGE_ROLE, newBridgeAdmin);
        revokeRole(BRIDGE_ROLE, oldBridgeAdmin);
    }

    /**
     * @dev Custom modifier that checks if `msg.sender` has either
     *      BRIDGE_ROLE or DEFAULT_ADMIN_ROLE.
     */
    modifier onlyBridgeOrAdmin() {
        require(
            hasRole(BRIDGE_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "TokenContract: Must have BRIDGE_ROLE or DEFAULT_ADMIN_ROLE"
        );
        _;
    }
}