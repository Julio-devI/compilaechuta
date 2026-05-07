import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import styles from "./PieChart.module.css";

export type PieChartType = {
  className?: string;
  rightIcon?: boolean;
  leftIcon?: boolean;
  text?: string;
  pieChart?: string;

  /** Variant props */
  color?: CSSProperties["color"];
  state?: CSSProperties["state"];
  type?: CSSProperties["type"];

  /** Action props */
  onArrowUpCircleClick?: () => void;
};

const PieChart: FunctionComponent<PieChartType> = ({
  className = "",
  color = "Blue",
  state = "Default",
  type = "Primary",
  rightIcon = false,
  leftIcon = true,
  text = "Dashboard",
  onArrowUpCircleClick,
  pieChart,
}) => {
  return (
    <Box
      className={[styles.root, className].join(" ")}
      data-color={color}
      data-state={state}
      data-type={type}
      onClick={onArrowUpCircleClick}
    >
      {!!leftIcon && (
        <img className={styles.pieChartIcon} alt="" src={pieChart} />
      )}
      <div className={styles.small}>{text}</div>
      {!!rightIcon && (
        <img
          className={styles.arrowUpCircleIcon}
          alt=""
          src="/Arrow-up-circle.svg"
        />
      )}
    </Box>
  );
};

export default PieChart;
