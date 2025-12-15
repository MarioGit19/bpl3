import { IRModule } from "../ir/IRModule";

export interface TargetBuilder {
  build(module: IRModule): string;
}
