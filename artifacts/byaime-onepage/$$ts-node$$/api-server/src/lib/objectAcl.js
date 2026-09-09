"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectPermission = exports.ObjectAccessGroupType = void 0;
exports.setObjectAclPolicy = setObjectAclPolicy;
exports.getObjectAclPolicy = getObjectAclPolicy;
exports.canAccessObject = canAccessObject;
var ACL_POLICY_METADATA_KEY = 'custom:aclPolicy';
// Can be flexibly defined according to the use case.
//
// Examples:
// - USER_LIST: the users from a list stored in the database;
// - EMAIL_DOMAIN: the users whose email is in a specific domain;
// - GROUP_MEMBER: the users who are members of a specific group;
// - SUBSCRIBER: the users who are subscribers of a specific service / content
//   creator.
var ObjectAccessGroupType;
(function (ObjectAccessGroupType) {
})(ObjectAccessGroupType || (exports.ObjectAccessGroupType = ObjectAccessGroupType = {}));
var ObjectPermission;
(function (ObjectPermission) {
    ObjectPermission["READ"] = "read";
    ObjectPermission["WRITE"] = "write";
})(ObjectPermission || (exports.ObjectPermission = ObjectPermission = {}));
function isPermissionAllowed(requested, granted) {
    if (requested === ObjectPermission.READ) {
        return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
    }
    return granted === ObjectPermission.WRITE;
}
var BaseObjectAccessGroup = /** @class */ (function () {
    function BaseObjectAccessGroup(type, id) {
        this.type = type;
        this.id = id;
    }
    return BaseObjectAccessGroup;
}());
function createObjectAccessGroup(group) {
    switch (group.type) {
        // Implement per access group type, e.g.:
        // case "USER_LIST":
        //   return new UserListAccessGroup(group.id);
        default:
            throw new Error("Unknown access group type: ".concat(group.type));
    }
}
function setObjectAclPolicy(objectFile, aclPolicy) {
    return __awaiter(this, void 0, void 0, function () {
        var exists;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, objectFile.exists()];
                case 1:
                    exists = (_b.sent())[0];
                    if (!exists) {
                        throw new Error("Object not found: ".concat(objectFile.name));
                    }
                    return [4 /*yield*/, objectFile.setMetadata({
                            metadata: (_a = {},
                                _a[ACL_POLICY_METADATA_KEY] = JSON.stringify(aclPolicy),
                                _a),
                        })];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getObjectAclPolicy(objectFile) {
    return __awaiter(this, void 0, void 0, function () {
        var metadata, aclPolicy;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, objectFile.getMetadata()];
                case 1:
                    metadata = (_b.sent())[0];
                    aclPolicy = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a[ACL_POLICY_METADATA_KEY];
                    if (!aclPolicy) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, JSON.parse(aclPolicy)];
            }
        });
    });
}
function canAccessObject(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var aclPolicy, _i, _c, rule, accessGroup;
        var userId = _b.userId, objectFile = _b.objectFile, requestedPermission = _b.requestedPermission;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, getObjectAclPolicy(objectFile)];
                case 1:
                    aclPolicy = _d.sent();
                    if (!aclPolicy) {
                        return [2 /*return*/, false];
                    }
                    if (aclPolicy.visibility === 'public' &&
                        requestedPermission === ObjectPermission.READ) {
                        return [2 /*return*/, true];
                    }
                    if (!userId) {
                        return [2 /*return*/, false];
                    }
                    if (aclPolicy.owner === userId) {
                        return [2 /*return*/, true];
                    }
                    _i = 0, _c = aclPolicy.aclRules || [];
                    _d.label = 2;
                case 2:
                    if (!(_i < _c.length)) return [3 /*break*/, 5];
                    rule = _c[_i];
                    accessGroup = createObjectAccessGroup(rule.group);
                    return [4 /*yield*/, accessGroup.hasMember(userId)];
                case 3:
                    if ((_d.sent()) &&
                        isPermissionAllowed(requestedPermission, rule.permission)) {
                        return [2 /*return*/, true];
                    }
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, false];
            }
        });
    });
}
//# sourceMappingURL=objectAcl.js.map