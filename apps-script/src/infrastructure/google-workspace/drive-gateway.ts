export interface DriveGatewayDependencies {
  driveApp: {
    createFolder(name: string): DriveFolderLike;
    getFolderById?(id: string): DriveFolderLike;
    getFileById?(id: string): DriveFileLike;
  };
  utilities?: {
    base64Decode(value: string): number[];
    base64Encode(data: number[]): string;
    newBlob(data: number[], mimeType: string, fileName: string): unknown;
  };
}

export interface CreateTenantFoldersRequest {
  businessName: string;
}

export interface FolderManifest {
  id: string;
  name: string;
}

export interface DatabaseFolderManifest extends FolderManifest {
  children: readonly FolderManifest[];
}

export interface TenantFolderManifest {
  root: FolderManifest;
  database: DatabaseFolderManifest;
  attachments: FolderManifest;
  backups: FolderManifest;
  exports: FolderManifest;
  archive: FolderManifest;
  templates: FolderManifest;
  generatedDocuments: FolderManifest;
}

export interface DriveGateway {
  createTenantFolders(request: CreateTenantFoldersRequest): TenantFolderManifest;
  savePrivateAttachment(request: SavePrivateAttachmentRequest): PrivateDriveFileManifest;
  readPrivateAttachment(request: ReadPrivateAttachmentRequest): PrivateDriveFileContent;
  trashPrivateAttachment(request: TrashPrivateAttachmentRequest): void;
}

interface DriveFolderLike {
  createFolder(name: string): DriveFolderLike;
  createFile?(blob: unknown): DriveFileLike;
  getId(): string;
  getName(): string;
}

interface DriveFileLike {
  getId(): string;
  getName(): string;
  getBlob?(): { getBytes(): number[] };
  setTrashed?(trashed: boolean): unknown;
}

export interface SavePrivateAttachmentRequest {
  folderId: string;
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export interface PrivateDriveFileManifest {
  driveFileId: string;
  fileName: string;
  mimeType: string;
}

export interface ReadPrivateAttachmentRequest {
  driveFileId: string;
}

export interface PrivateDriveFileContent {
  contentBase64: string;
}

export interface TrashPrivateAttachmentRequest {
  driveFileId: string;
}

export function createDriveGateway(deps: DriveGatewayDependencies): DriveGateway {
  return {
    createTenantFolders(request) {
      const root = deps.driveApp.createFolder(`Sales Management - ${request.businessName}`);
      const database = root.createFolder('Database');
      const databaseChildren = [
        database.createFolder('Core Data'),
        database.createFolder('Runtime Data'),
        database.createFolder('Transaction Data'),
      ].map(toFolderManifest);

      return {
        root: toFolderManifest(root),
        database: {
          ...toFolderManifest(database),
          children: databaseChildren,
        },
        attachments: toFolderManifest(root.createFolder('Attachments')),
        backups: toFolderManifest(root.createFolder('Backups')),
        exports: toFolderManifest(root.createFolder('Exports')),
        archive: toFolderManifest(root.createFolder('Archive')),
        templates: toFolderManifest(root.createFolder('Templates')),
        generatedDocuments: toFolderManifest(root.createFolder('Generated Documents')),
      };
    },
    savePrivateAttachment(request) {
      const folder = requireGetFolderById(deps.driveApp)(request.folderId);
      if (folder.createFile === undefined) {
        throw new Error('Drive folder adapter does not support createFile.');
      }

      const blob = createBlob(deps, request);
      const file = folder.createFile(blob);
      return {
        driveFileId: file.getId(),
        fileName: file.getName(),
        mimeType: request.mimeType,
      };
    },
    readPrivateAttachment(request) {
      const file = requireGetFileById(deps.driveApp)(request.driveFileId);
      if (file.getBlob === undefined) {
        throw new Error('Drive file adapter does not support getBlob.');
      }
      if (deps.utilities === undefined) {
        throw new Error('Drive gateway utilities are required to read private attachments.');
      }

      return {
        contentBase64: deps.utilities.base64Encode(file.getBlob().getBytes()),
      };
    },
    trashPrivateAttachment(request) {
      const file = requireGetFileById(deps.driveApp)(request.driveFileId);
      if (file.setTrashed === undefined) {
        throw new Error('Drive file adapter does not support setTrashed.');
      }
      file.setTrashed(true);
    },
  };
}

function toFolderManifest(folder: DriveFolderLike): FolderManifest {
  return {
    id: folder.getId(),
    name: folder.getName(),
  };
}

function requireGetFolderById(driveApp: DriveGatewayDependencies['driveApp']): (id: string) => DriveFolderLike {
  if (driveApp.getFolderById === undefined) {
    throw new Error('Drive adapter does not support getFolderById.');
  }
  return (id) => driveApp.getFolderById?.(id) ?? driveApp.createFolder(id);
}

function requireGetFileById(driveApp: DriveGatewayDependencies['driveApp']): (id: string) => DriveFileLike {
  if (driveApp.getFileById === undefined) {
    throw new Error('Drive adapter does not support getFileById.');
  }
  return (id) => {
    if (driveApp.getFileById === undefined) {
      throw new Error('Drive adapter does not support getFileById.');
    }
    return driveApp.getFileById(id);
  };
}

function createBlob(deps: DriveGatewayDependencies, request: SavePrivateAttachmentRequest): unknown {
  if (deps.utilities === undefined) {
    return {
      dataBase64: request.contentBase64,
      mimeType: request.mimeType,
      fileName: request.fileName,
    };
  }

  return deps.utilities.newBlob(
    deps.utilities.base64Decode(request.contentBase64),
    request.mimeType,
    request.fileName,
  );
}
